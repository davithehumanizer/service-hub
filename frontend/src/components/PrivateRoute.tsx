import { Route, Redirect } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../stores/globalStore';

interface PrivateRouteProps {
  component: React.ComponentType<any>;
  path: string;
  exact?: boolean;
}

// eslint-disable-next-line react/prop-types
const PrivateRoute: React.FC<PrivateRouteProps> = ({ component: Component, ...rest }) => {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <Route
      {...rest}
      render={(props) =>
        user ? <Component {...props} /> : <Redirect to="/login" />
      }
    />
  );
};

export default PrivateRoute;